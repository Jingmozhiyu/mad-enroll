package com.jing.monitor.common;

import lombok.Data;

/**
 * Generic API response wrapper.
 *
 * @param <T> response payload type
 */
@Data
public class Result<T> {
    private Integer code;
    private String msg;
    private T data;

    /**
     * Creates a success result with payload.
     *
     * @param data response data
     * @param <T> payload type
     * @return success result
     */
    public static <T> Result<T> success(T data) {
        Result<T> r = new Result<>();
        r.setCode(200);
        r.setMsg("success");
        r.setData(data);
        return r;
    }

    /**
     * Creates a success result without payload.
     *
     * @param <T> payload type
     * @return success result
     */
    public static <T> Result<T> success() {
        Result<T> r = new Result<>();
        r.setCode(200);
        r.setMsg("success");
        r.setData(null);
        return r;
    }

    /**
     * Creates an error result with message.
     *
     * @param msg error message
     * @param <T> payload type
     * @return error result
     */
    public static <T> Result<T> error(String msg) {
        Result<T> r = new Result<>();
        r.setCode(500);
        r.setMsg(msg);
        return r;
    }
}
