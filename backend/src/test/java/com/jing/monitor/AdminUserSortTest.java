package com.jing.monitor;

import com.jing.monitor.model.CourseSection;
import com.jing.monitor.model.User;
import com.jing.monitor.model.UserSectionSubscription;
import com.jing.monitor.model.dto.AdminUserSubsRespDto;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * The admin user list sorts on the whole table (not one page) by email, registration time or
 * enabled subscription count, in both directions.
 */
class AdminUserSortTest extends IntegrationTestBase {

    @Test
    void sortsUsersByEmailRegistrationAndEnabledSubscriptions() {
        // admin@example.com (from the base) registers now with no subscriptions.
        User carol = user("carol@example.com", LocalDateTime.of(2026, 1, 3, 12, 0));
        User bob = user("bob@example.com", LocalDateTime.of(2026, 1, 1, 12, 0));
        User dave = user("dave@example.com", LocalDateTime.of(2026, 1, 2, 12, 0));
        CourseSection first = section("1272", "000001");
        CourseSection second = section("1272", "000002");
        CourseSection third = section("1272", "000003");
        // bob: 2 enabled; dave: 1 enabled + 2 disabled (disabled ones must not count); carol: 0.
        subscribe(bob, first, true);
        subscribe(bob, second, true);
        subscribe(dave, first, true);
        subscribe(dave, second, false);
        subscribe(dave, third, false);

        assertThat(emails("email", "asc"))
                .containsExactly("admin@example.com", "bob@example.com", "carol@example.com", "dave@example.com");
        assertThat(emails("email", "desc"))
                .containsExactly("dave@example.com", "carol@example.com", "bob@example.com", "admin@example.com");
        assertThat(emails("registered", "asc"))
                .containsExactly("bob@example.com", "dave@example.com", "carol@example.com", "admin@example.com");
        assertThat(emails("registered", "desc"))
                .containsExactly("admin@example.com", "carol@example.com", "dave@example.com", "bob@example.com");
        // Equal counts fall back to email order in both directions.
        assertThat(emails("subscribed", "asc"))
                .containsExactly("admin@example.com", "carol@example.com", "dave@example.com", "bob@example.com");
        assertThat(emails("subscribed", "desc"))
                .containsExactly("bob@example.com", "dave@example.com", "admin@example.com", "carol@example.com");

        AdminUserSubsRespDto daveRow = admin.getUserSubscriptionsPage(1, "subscribed", "desc").getItems().get(1);
        assertThat(daveRow.getSubscriptions()).hasSize(3);
        assertThat(daveRow.getRegisteredAt()).isEqualTo(LocalDateTime.of(2026, 1, 2, 12, 0));
        assertThat(admin.getUserSubscriptionsPage(1, "subscribed", "asc").getTotalItems()).isEqualTo(4);
    }

    @Test
    void rejectsUnknownSortFieldOrDirection() {
        assertThatThrownBy(() -> admin.getUserSubscriptionsPage(1, "role", "asc"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> admin.getUserSubscriptionsPage(1, "email", "up"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private User user(String email, LocalDateTime createdAt) {
        User created = new User(email, "unused-password-hash");
        created.setCreatedAt(createdAt);
        return users.save(created);
    }

    private void subscribe(User owner, CourseSection section, boolean enabled) {
        UserSectionSubscription subscription = new UserSectionSubscription();
        subscription.setUser(owner);
        subscription.setSection(section);
        subscription.setEnabled(enabled);
        subscriptions.save(subscription);
    }

    private List<String> emails(String sort, String direction) {
        return admin.getUserSubscriptionsPage(1, sort, direction).getItems().stream()
                .map(AdminUserSubsRespDto::getEmail)
                .toList();
    }
}
